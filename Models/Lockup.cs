using System;
using System.Collections.Generic;

namespace centrny1.Models;

public partial class Lockup
{
    public int PaymentCode { get; set; }

    public string PaymentName { get; set; } = null!;

    public virtual ICollection<Attend> Attends { get; set; } = new List<Attend>();
}
